//initialise interface etc

var ewd = require('../ewdGlobals');

// For GT.M:
var globals = require('/home/vista/mumps');
var db = new globals.Gtm();
db.open();

/*
 // For Cache / GlobalsDB:
var globals = require("c:\\Program Files\\nodejs\\cache");
var db = new globals.Cache();
var params = {
  path:"c:\\InterSystems\\Cache\\Mgr",
  username: "_SYSTEM",
  password: "SYS",
  namespace: "USER"
};
db.open(params);
*/

ewd.init(db);

// initialisation complete

var patient = new ewd.GlobalNode("patient", [123456]);
patient._delete();

var document = {
  "birthdate": -851884200,
  "conditions": [
    {
      "causeOfDeath": null,
      "codes": {
        "ICD-9-CM": [
          "410.00"
        ],
        "ICD-10-CM": [
          "I21.01"
        ]
      },
      "description": "Diagnosis, Active: Hospital Measures - AMI (Code List: 2.16.840.1.113883.3.666.5.3011)",
      "end_time": 1273104000,
      "free_text": null,
      "mood_code": "EVN",
      "name": null,
      "negationInd": null,
      "negationReason": null,
      "oid": "2.16.840.1.113883.3.560.1.2",
      "ordinality": {
        "codeSystem": "SNOMED-CT",
        "code": "63161005",
        "title": "Hospital Measures - Principal"
      },
      "priority": null,
      "reason": null,
      "severity": null,
      "specifics": null,
      "start_time": 1272645000,
      "status_code": {
        "SNOMED-CT": [
          "55561003"
        ],
        "HL7 ActStatus": [
          "active"
        ]
      },
      "time": null,
      "type": null,
      "_type": "Condition"
    }
  ],
  "description": "",
  "encounters": [
    {
      "admitTime": 1272643200,
      "admitType": null,
      "codes": {
        "SNOMED-CT": [
          "112689000"
        ]
      },
      "description": "Encounter, Performed: Hospital Measures-Encounter Inpatient (Code List: 2.16.840.1.113883.3.666.5.625)",
      "dischargeDisposition": null,
      "dischargeTime": 1273104000,
      "end_time": 1273104000,
      "free_text": null,
      "mood_code": "EVN",
      "negationInd": null,
      "negationReason": null,
      "oid": "2.16.840.1.113883.3.560.1.79",
      "performer_id": null,
      "reason": null,
      "specifics": null,
      "start_time": 1272643200,
      "status_code": {
        "HL7 ActStatus": [
          "performed"
        ]
      },
      "time": null,
      "transferFrom": null,
      "transferTo": null,
      "_type": "Encounter"
    }
  ],
  "ethnicity": {
    "code": "2186-5",
    "name": "Not Hispanic or Latino",
    "codeSystem": "CDC Race"
  },
  "expired": false,
  "first": "AMI_ADULT",
  "gender": "F",
  "insurance_providers": [
    {
      "end_time": null,
      "financial_responsibility_type": {
        "code": "SELF",
        "codeSystem": "HL7 Relationship Code"
      },
      "member_id": "1234567890",
      "name": "Other",
      "payer": {
        "name": "Other",
        "_type": null
      },
      "relationship": null,
      "start_time": 1199163600,
      "time": null,
      "type": "OT",
      "_type": null
    }
  ],
  "last": "A",
  "measure_ids": [
    "8A4D92B2-3887-5DF3-0139-0C4E41594C98",
    "8A4D92B2-37D1-F95B-0137-DD4B0EB62DE6",
    "8A4D92B2-3887-5DF3-0139-0C4E00454B35"
  ],
  "measure_period_end": 1325307600000,
  "measure_period_start": 1293858000000,
  "medical_record_number": "caf50e70e548d61d097c68e9001ded60",
  "medications": [
    {
      "administrationTiming": null,
      "codes": {
        "RxNorm": [
          "238721"
        ]
      },
      "cumulativeMedicationDuration": null,
      "deliveryMethod": null,
      "description": "Medication, Administered: Hospital Measures-Fibrinolytic Therapy (Code List: 2.16.840.1.113883.3.666.5.736)",
      "dose": null,
      "doseIndicator": null,
      "doseRestriction": null,
      "end_time": 1272659400,
      "freeTextSig": null,
      "free_text": null,
      "fulfillmentInstructions": null,
      "indication": null,
      "mood_code": "EVN",
      "negationInd": null,
      "negationReason": null,
      "oid": "2.16.840.1.113883.3.560.1.14",
      "patientInstructions": null,
      "productForm": null,
      "reaction": null,
      "reason": null,
      "route": null,
      "site": null,
      "specifics": null,
      "start_time": 1272657600,
      "statusOfMedication": null,
      "status_code": {
        "HL7 ActStatus": [
          "administered"
        ]
      },
      "time": null,
      "typeOfMedication": null,
      "vehicle": null,
      "_type": "Medication"
    }
  ],
  "procedures": [
    {
      "codes": {
        "ICD-9-CM": [
          "794.31"
        ],
        "ICD-10-CM": [
          "R94.31"
        ]
      },
      "description": "Diagnostic Study, Result: Hospital Measures-ECG (Code List: 2.16.840.1.113883.3.666.5.735)",
      "end_time": 1272647400,
      "free_text": null,
      "incisionTime": null,
      "mood_code": "EVN",
      "negationInd": null,
      "negationReason": null,
      "oid": "2.16.840.1.113883.3.560.1.11",
      "ordinality": null,
      "performer_id": null,
      "reason": null,
      "site": null,
      "source": null,
      "specifics": null,
      "start_time": 1272647400,
      "status_code": {
        "HL7 ActStatus": [
          null
        ]
      },
      "time": null,
      "values": [
        {
          "codes": {
            "ICD-10-CM": [
              "I21.09"
            ]
          },
          "description": "Hospital Measures-ST-segment elevation",
          "_type": "CodedResultValue"
        }
      ],
      "_type": "Procedure"
    }
  ],
  "race": {
    "code": "1002-5",
    "name": "American Indian or Alaska Native",
    "codeSystem": "CDC Race"
  },
  "results": [

  ],
  "source_data_criteria": [
    {
      "id": "EncounterPerformedHospitalMeasuresEncounterInpatient",
      "start_date": 1272657600000,
      "end_date": 1273118400000,
      "value": [

      ],
      "negation": "",
      "negation_code_list_id": null,
      "field_values": {
        "DISCHARGE_DATETIME": {
          "type": "TS",
          "value": "05/06/2010 00:00"
        },
        "ADMISSION_DATETIME": {
          "type": "TS",
          "value": "04/30/2010 16:00"
        }
      },
      "oid": "2.16.840.1.113883.3.666.5.625"
    },
    {
      "id": "DiagnosisActiveHospitalMeasuresAmi",
      "start_date": 1272659400000,
      "end_date": 1273118400000,
      "value": [

      ],
      "negation": "",
      "negation_code_list_id": null,
      "field_values": {
        "ORDINAL": {
          "type": "CD",
          "code_list_id": "2.16.840.1.113883.3.666.5.3010",
          "title": "hospital_measures_principal (8A4D92B2-3887-5DF3-0139-0D01C6626E46)"
        }
      },
      "oid": "2.16.840.1.113883.3.666.5.3011"
    },
    {
      "id": "DiagnosticStudyResultHospitalMeasuresEcg",
      "start_date": 1272661800000,
      "end_date": 1272661800000,
      "value": [
        {
          "type": "CD",
          "code_list_id": "2.16.840.1.113883.3.666.5.1096",
          "title": "hospital_measures_st_segment_elevation (5089376a044a1137540005d3)"
        }
      ],
      "negation": "",
      "negation_code_list_id": null,
      "field_values": {
      },
      "oid": "2.16.840.1.113883.3.666.5.735"
    },
    {
      "id": "MedicationAdministeredHospitalMeasuresFibrinolyticTherapy",
      "start_date": 1272672000000,
      "end_date": 1272673800000,
      "value": [

      ],
      "negation": "",
      "negation_code_list_id": null,
      "field_values": {
      },
      "oid": "2.16.840.1.113883.3.666.5.736"
    },
    {
      "id": "MeasurePeriod",
      "start_date": 1293858000000,
      "end_date": 1325307600000
    }
  ],
  "type": "eh"
};

patient._setDocument(document);

patient._fixProperties();

console.log("Condition: " + patient.conditions[0].description._value);
console.log("ICD-10 procedure code: " + patient.procedures[0].codes['ICD-10-CM'][0]._value);

var meds = patient.medications[0]._getDocument();
console.log("meds: " + JSON.stringify(meds));

db.close();
