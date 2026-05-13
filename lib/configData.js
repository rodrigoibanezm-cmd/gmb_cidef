export const schema = {
  version: "v1",
  type: "object",
  required: [
    "place_id",
    "name",
    "address",
    "normalized_location",
    "ownership_group",
    "store_role",
    "brand",
    "operator",
    "status",
    "confidence",
    "review_reason"
  ],
  properties: {
    place_id: { type: "string" },
    name: { type: "string" },
    address: { type: "string" },
    normalized_location: { type: "string" },
    ownership_group: {
      type: "string",
      enum: ["cidef", "competitor", "other", "trash", "unknown"]
    },
    store_role: {
      type: "string",
      enum: ["own_store", "dealer", "service", "parts", "hub", "other", "trash", "unknown"]
    },
    brand: { type: "string" },
    operator: { type: "string" },
    status: {
      type: "string",
      enum: ["keep", "review", "trash"]
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    review_reason: { type: "string" }
  },
  additionalProperties: false
};

export const catalogs = {
  version: "v1",
  brands: [
    "dongfeng",
    "dfsk",
    "forthing",
    "jac",
    "jetour",
    "changan",
    "geely",
    "gac",
    "great_wall",
    "haval",
    "mg",
    "maxus",
    "byd",
    "chery",
    "omoda",
    "jaecoo",
    "kia",
    "hyundai",
    "toyota",
    "nissan",
    "chevrolet",
    "suzuki",
    "ford",
    "mitsubishi",
    "mazda",
    "peugeot",
    "citroen",
    "renault",
    "volkswagen",
    "fiat",
    "ram",
    "jeep",
    "subaru",
    "honda",
    "unknown"
  ],
  operators: [
    "cidef",
    "derco",
    "inchcape",
    "salazar_israel",
    "rosselot",
    "pompeyo_carrasco",
    "yusic",
    "sergio_escobar",
    "portillo",
    "autofin",
    "automotora_bilbao",
    "bruno_fritsch",
    "curifor",
    "circulo_autos",
    "unknown"
  ],
  normalized_locations: [
    "mall_plaza_vespucio",
    "costanera_center",
    "mall_plaza_oeste",
    "mall_plaza_egana",
    "mall_plaza_tobalaba",
    "mall_plaza_norte",
    "mall_plaza_los_dominicos",
    "parque_arauco",
    "alto_las_condes",
    "portal_nunoa",
    "mall_sport",
    "autoplaza",
    "automotora_bilbao_sector",
    "movicenter",
    "ciudad_empresarial",
    "unknown"
  ],
  status: ["keep", "review", "trash"],
  ownership_groups: ["cidef", "competitor", "other", "trash", "unknown"],
  store_roles: ["own_store", "dealer", "service", "parts", "hub", "other", "trash", "unknown"],
  rules: {
    default_when_uncertain: {
      status: "review",
      confidence_max: 0.6
    },
    do_not_invent_catalog_values: true,
    preserve_original_name_and_address: true,
    normalize_location_only_from_catalog: true
  }
};
