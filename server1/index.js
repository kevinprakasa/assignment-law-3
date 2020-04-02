const express = require("express");
const app = express();
const port = 3000;
const path = require("path");
var request = require("request");
const fs = require("fs");
const formidable = require("formidable");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/index.html"));
});

//function to generate random string
function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

app.post("/post-file", (req, response) => {
  const form = formidable();
  // receiving file from client
  form.parse(req, (err, fields, files) => {
    if (err) {
      next(err);
      return;
    }
    // rename file
    var oldpath = files.file.path;
    var newpath = oldpath + files.file.name;
    console.log("Server 1 got file named" + files.file.name);
    fs.rename(oldpath, newpath, function(err) {
      if (err) throw err;
      // sending file to server 2
      const options = {
        method: "POST",
        url: "http://localhost:4000/post-file",
        headers: {
          "X-ROUTING-KEY": makeid(10)
        },
        formData: {
          file: fs.createReadStream(newpath)
        }
      };
      console.log(
        "Server 1 send GET request to server 2 with x-routing-key = " +
          options.headers["X-ROUTING-KEY"]
      );
      request(options, function(err, res, body) {
        if (err) console.log(err);
        console.log(body);
        // send back to client
        response.send(body);
      });
    });
  });
});
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
