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
            console.log(obj.servicePoints[0].kapany.status);
            if (obj.servicePoints[0].kapany.status === "ACTIVE") {
              return true;
            } else return false;
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
              res.send(response.results).status(200);
            });
        } catch (err) {
          console.log("Error parsing JSON string:", err);
        }
      }
    );
  } else {
    res.send("Not available");
  }
});
app.listen(PORT, () => {
  console.log(`Server up and running on ${PORT}`);
});
