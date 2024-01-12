const collections = require('./config/collections.js');
const sass = require("sass");
const path = require('node:path');
const { JSDOM } = require("jsdom");
const fs = require('fs');
const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
// CommonJS can't require ESM modules, so we have to use an import() hack instead
let CETEI;
import("CETEIcean").then((ceteicean) => {
  CETEI = ceteicean.default;
})

module.exports = function(eleventyConfig) {

  eleventyConfig.addPassthroughCopy({"src/assets/favicon.ico": "favicon.ico"});
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/css/*.css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/img": "img" });
  eleventyConfig.addPassthroughCopy("src/**/*.var");

  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addTemplateFormats("xml");

  eleventyConfig.setUseGitIgnore(false);

  eleventyConfig.addExtension("scss", {

    compileOptions: {
      permalink: function(contents, inputPath) {
        return (data) => {
          return inputPath.replace("src/assets", "").replace(".scss", ".css");
        }
      }
    },

    compile: async function(inputContent, inputPath) {
      let parsed = path.parse(inputPath);
      let result = sass.compileString(inputContent, {
        loadPaths: [
          parsed.dir || ".",
          this.config.dir.includes
        ]
      });

      return async (data) => {
        return result.css;
      };
    }
  });

  eleventyConfig.addExtension("xml", {

    getData: async function(inputPath) {
      const file = fs.readFileSync(inputPath, 'utf8');
      const jdom = new JSDOM(file, { contentType: "text/xml" });
      return {
        "title": jdom.window.document.querySelector("titleStmt > title").textContent,
        "navkey": inputPath.replace(".*/", "").replace(".xml", ""),
        "eleventyNavigation": {
          key: inputPath.replace(".*/", "").replace(".xml", ""),
          title: jdom.window.document.querySelector("titleStmt > title").textContent
        }
      }
    },

    compile: async function(contents, inputPath) {
      const jdom = new JSDOM(contents, { contentType: "text/xml" });
      let cetei = new CETEI({ documentObject: jdom.window.document });
      let doc = await cetei.domToHTML5(jdom.window.document);
      return async (data) => {
        return cetei.utilities.serializeHTML(doc, true);
      };
    }
  });

  Object.keys(collections).forEach(collectionName => {
    eleventyConfig.addCollection(collectionName, collections[collectionName]);
  });

  return {
    dir: {
      input: 'src',
      output: 'dist',
      includes: '_includes',
      layouts: '_layouts'
    }
  }
}