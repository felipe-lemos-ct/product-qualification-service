import express from "express";
import bodyParser from "body-parser";
const app = express();
import { fetchCt, fetchHybris } from "./commercetools/auth.js";

const PORT = process.env.PORT || 8080;
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Welcome to subscription handler.");
});

app.post("/ct-cart", (req, res) => {
  fetchCt(`products/`, { method: "GET" })
    .then((response) => response.json())
    .then((response) => {
      console.log(response);
    });

  return res.send(204);
});

app.listen(PORT, () => {
  console.log(`Server up and running on ${PORT}`);
});
