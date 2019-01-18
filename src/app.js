const fs = require("fs");
const Express = require("./express.js");
const app = new Express();
const decodingKeys = require("./decoding.json");
let comments;

const readComments = function(req, res, next) {
  fs.readFile("./data.json", (err, data) => {
    comments = JSON.parse(data);
    next();
  });
};

const send = function(res, content, statusCode = 200) {
  res.statusCode = statusCode;
  res.write(content);
  res.end();
};

const getFilePath = function(url) {
  if (url == "/") return "./publicHtml/index.html";
  return "./publicHtml" + url;
};

const renderContents = (req, res) => {
  const url = getFilePath(req.url);
  fs.readFile(`${url}`, (err, data) => {
    if (err) {
      send(res, "Not Found", 404);
      return;
    }
    send(res, data);
  });
};

const readArgs = content => {
  let args = {};
  const splitKeyValue = pair => pair.split("=");
  const assignKeyValueToArgs = ([key, value]) => (args[key] = value);
  content
    .split("&")
    .map(splitKeyValue)
    .forEach(assignKeyValueToArgs);
  return args;
};

const appendContent = function(commentData, req, res) {
  comments.push(commentData);
  fs.writeFile("./data.json", JSON.stringify(comments), err => {
    if (err) console.log(err);
    render(req, res);
  });
};

const decodeText = content => {
  let result = content;
  Object.keys(decodingKeys).forEach(x => {
    result = result.replace(new RegExp(`\\${x}`, "g"), decodingKeys[x]);
  });
  return result;
};

const postContent = function(req, res, next) {
  let commentData = decodeText(req.body);
  commentData = readArgs(commentData);
  const date = new Date().toLocaleString();
  commentData.date = date;
  appendContent(commentData, req, res);
};

const readBody = (req, res, next) => {
  let content = "";
  req.on("data", chunk => (content += chunk));
  req.on("end", () => {
    req.body = content;
    next();
  });
};

const generateHTML = function(contents) {
  let html = "<table>";
  for (const content of contents) {
    html += `<tr><td>${content.date}_</td><td>${content.name}_</td><td>${
      content.comment
    }</td></tr>`;
  }
  return html + "</table>";
};

const render = function(req, res) {
  fs.readFile("./data.json", (err, data) => {
    console.log(data.toString());
    const commentsData = JSON.parse(data);
    let upperPart = "";
    fs.readFile("./publicHtml/guestBook.html", (err, data) => {
      if (err) throw err;
      upperPart += data;
      lowerPart = generateHTML(commentsData);
      send(res, upperPart + lowerPart, 200);
    });
  });
};

const logRequest = (req, res, next) => {
  console.log(req.method, req.url);
  next();
};

app.use(readBody);
app.use(logRequest);
app.use(readComments);
app.get("/guestBook.html", render);
app.post("/guestBook.html", postContent);
app.use(renderContents);

// Export a function that can act as a handler

module.exports = app.handleRequest.bind(app);
