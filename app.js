import express from "express";
import bodyParser from "body-parser";
const app = express();
import { fetchCt } from "./commercetools/auth.js";
import fs from "fs";
import fetch from "node-fetch";

const PORT = process.env.PORT || 8080;
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Welcome to subscription handler.");
});

//Get products after feasibility:

app.post("/getproducts", (req, res) => {
  const { addressId } = req.body;
  let upSpeed = 0;
  let testCaseNumber = 0;

  console.log(addressId);
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
      console.log("Not found");
      break;
  }
  //Here is Availability

  let availability = JSON.parse(
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

  console.log(
    "This is the availability: ",
    availability.servicePoints[0].kapany.status
  );
  //Here is Feasibility

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
          fetchCt(
            `product-projections/search?filter=variants.attributes.fiberBroadbandBandwidth.key:${object.broadband.upSpeed}`,
            { method: "GET" }
          )
            .then((response) => response.json())
            .then((response) => {
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
