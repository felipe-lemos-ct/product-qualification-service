import express from "express";
import bodyParser from "body-parser";
const app = express();
import { fetchCt } from "./commercetools/auth.js";
import fs from "fs";

const PORT = process.env.PORT || 8080;
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Welcome to subscription handler.");
});

app.post("/getproducts", (req, res) => {
  const { addressId } = req.body;
  let testCaseNumber = 0;
  let availability = "";

  switch (addressId) {
    case 41213927:
      testCaseNumber = 1;
      break;
    case 41212756:
      testCaseNumber = 2;
      break;
    case 41212753:
      testCaseNumber = 3;
      break;
    default:
      testCaseNumber = 0;
      break;
  }

  console.log("I am running now!");
  //Check availability for the desired
  if (testCaseNumber != 0) {
    availability = JSON.parse(
      fs.readFileSync(
        `./data/TestCase${testCaseNumber}_API-Availability.json`,
        (err, data) => {
          if (err) {
            console.log("Error reading file from disk:", err);
            return "error";
          } else {
            let obj = JSON.parse(data);
            return {
              availableSkus: [],
              isAvailable: false,
              status: obj.servicePoints[0].kapany.status,
              message: obj.servicePoints[0].salesDescription,
            };
          }
        }
      )
    );
  }

  let bandwidthArray = ["50", "100", "250", "500", "1000"];
  let lookupArray = [];

  if (availability.servicePoints[0].kapany.status === "ACTIVE") {
    fs.readFile(
      `./data/TestCase${testCaseNumber}_API-Feasibility.json`,
      (err, data) => {
        if (err) {
          console.log("Error reading file from disk:", err);
          return;
        }
        try {
          let object = JSON.parse(data);
          lookupArray = bandwidthArray.filter(
            (bdwidth) => bdwidth <= object.broadband.upSpeed
          );

          fetchCt(
            `product-projections/search?filter=variants.attributes.fiberBroadbandBandwidth.key:${lookupArray.toString()}`,
            { method: "GET" }
          )
            .then((response) => response.json())
            .then((response) => {
              response.results.map((result) => {
                if (result.variants.length > 0) {
                  result.variants = result.variants.filter((variant) => {
                    return (
                      variant.attributes[0].value.key <=
                      object.broadband.upSpeed
                    );
                  });
                }
              });
              let skus = [];
              response.results.map((result) => {
                skus.push(result.masterVariant.sku);
                if (result.variants.length > 0) {
                  result.variants.map((variant) => {
                    skus.push(variant.sku);
                  });
                }
              });
              console.log("These are the skus:", skus);
              res
                .send({
                  availableSkus: skus,
                  isAvailable: true,
                  status: availability.servicePoints[0].kapany.status,
                  message: availability.servicePoints[0].salesDescription,
                })
                .status(200);
            });
        } catch (err) {
          console.log("Error parsing JSON string:", err);
        }
      }
    );
  } else {
    res.send({
      availableSkus: [],
      isAvailable: false,
      status: availability.servicePoints[0].kapany.status,
      message: availability.servicePoints[0].salesDescription,
    });
  }
});
app.listen(PORT, () => {
  console.log(`Server up and running on ${PORT}`);
});
