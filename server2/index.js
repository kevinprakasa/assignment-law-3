const express = require("express");
const app = express();
const port = 4000;
const compressing = require("compressing");
const fileupload = require("express-fileupload");
const fs = require("fs");
var q = "tasks";

var open = require("amqplib").connect(
  "amqp://0806444524:0806444524@152.118.148.95:5672/%2F0806444524"
);

app.use(fileupload());

function compressFile(originPath, compressedPath, routingKey) {
  return new Promise((resolve, reject) => {
    let current_percentage = 0;
    open
      .then(function(conn) {
        return conn.createChannel();
      })
      .then(function(ch) {
        return ch.assertQueue(q).then(function(ok) {
          var exchange = "1606917696";
          ch.assertExchange(exchange, "direct", {
            durable: false
          });
          new compressing.gzip.FileStream({ source: originPath })
            .on("error", reject)
            .pipe(fs.createWriteStream(compressedPath))
            .on("error", reject)
            .on("drain", _ => {
              const real_size = fs.statSync(originPath).size;
              const zip_size = fs.statSync(compressedPath).size;
              const zip_percentage =
                Math.floor((zip_size / real_size) * 10) * 10; // showing percentage on multiply of 10
              if (zip_percentage !== current_percentage) {
                current_percentage = zip_percentage;
                ch.publish(
                  exchange,
                  routingKey,
                  Buffer.from(zip_percentage + "%")
                );
              }
            })
            .on("finish", _ => {
              ch.publish(exchange, routingKey, Buffer.from(100 + "%"));
              resolve();
            });
        });
      })
      .catch(e => {
        console.log(e);
      });
  });
}

app.post("/post-file", (req, res) => {
  if (req.files) {
    const { file } = req.files;
    const { name } = file;
    const uploadedPath = "./upload/" + name;
    file.mv(uploadedPath, err => {
      if (err) {
        res.status(500).send("error uploading files");
      } else {
        const compressedPath = "./compressed/" + name + ".zip";
        res.send(req.headers["x-routing-key"]);
        compressFile(uploadedPath, compressedPath, req.headers["x-routing-key"])
          .then(() => {
            console.log("Success compressing file");
          })
          .catch(e => {
            res.status(500).send("failed compress file");
          });
      }
    });
  } else {
    res.status(400).send({ error_description: "No files were provided" });
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
