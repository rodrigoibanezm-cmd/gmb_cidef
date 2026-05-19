param(
  [string]$InputCsv = "tools/places-discovery/sodimac-own.csv",
  [string]$OutputCsv = "tools/places-discovery/output/sodimac-own-candidates.csv",
  [int]$MaxResultCount = 3,
  [int]$SleepMs = 250
)

$apiKey = $env:GOOGLE_MAPS_API_KEY
if (-not $apiKey) {
  throw "Missing GOOGLE_MAPS_API_KEY. Set it with: `$env:GOOGLE_MAPS_API_KEY = 'YOUR_KEY'"
}

if (-not (Test-Path $InputCsv)) {
  throw "Input CSV not found: $InputCsv"
}

$outputDir = Split-Path $OutputCsv -Parent
if ($outputDir -and -not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$headers = @{
  "Content-Type" = "application/json"
  "X-Goog-Api-Key" = $apiKey
  "X-Goog-FieldMask" = "places.id,places.displayName,places.formattedAddress"
}

$rows = Import-Csv $InputCsv
$results = New-Object System.Collections.Generic.List[object]

foreach ($row in $rows) {
  Write-Host "Searching: $($row.query)"

  $body = @{
    textQuery = $row.query
    maxResultCount = $MaxResultCount
    languageCode = "es"
    regionCode = "CL"
  } | ConvertTo-Json -Depth 5

  try {
    $response = Invoke-RestMethod `
      -Uri "https://places.googleapis.com/v1/places:searchText" `
      -Method Post `
      -Headers $headers `
      -Body $body

    $rank = 0
    foreach ($place in @($response.places)) {
      $rank += 1
      $results.Add([pscustomobject]@{
        tenant_id = $row.tenant_id
        industry = $row.industry
        query = $row.query
        expected_brand = $row.expected_brand
        expected_store_role = $row.expected_store_role
        expected_location = $row.expected_location
        ownership_group = $row.ownership_group
        candidate_rank = $rank
        place_id = $place.id
        name = $place.displayName.text
        address = $place.formattedAddress
        brand = $row.expected_brand
        store_role = $row.expected_store_role
        normalized_location = $row.expected_location
        status = "pending_review"
      }) | Out-Null
    }

    if (-not $response.places) {
      $results.Add([pscustomobject]@{
        tenant_id = $row.tenant_id
        industry = $row.industry
        query = $row.query
        expected_brand = $row.expected_brand
        expected_store_role = $row.expected_store_role
        expected_location = $row.expected_location
        ownership_group = $row.ownership_group
        candidate_rank = $null
        place_id = $null
        name = $null
        address = $null
        brand = $row.expected_brand
        store_role = $row.expected_store_role
        normalized_location = $row.expected_location
        status = "not_found"
      }) | Out-Null
    }
  }
  catch {
    $message = $_.ErrorDetails.Message
    if (-not $message) { $message = $_.Exception.Message }

    $results.Add([pscustomobject]@{
      tenant_id = $row.tenant_id
      industry = $row.industry
      query = $row.query
      expected_brand = $row.expected_brand
      expected_store_role = $row.expected_store_role
      expected_location = $row.expected_location
      ownership_group = $row.ownership_group
      candidate_rank = $null
      place_id = $null
      name = $null
      address = $message
      brand = $row.expected_brand
      store_role = $row.expected_store_role
      normalized_location = $row.expected_location
      status = "error"
    }) | Out-Null
  }

  Start-Sleep -Milliseconds $SleepMs
}

$results | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $OutputCsv
Write-Host "Done. Wrote: $OutputCsv"
