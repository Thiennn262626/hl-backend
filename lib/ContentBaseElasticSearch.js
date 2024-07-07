const _ = require("underscore");
const Vector = require("vector-object");
const striptags = require("striptags");
const sw = require("stopword");
const natural = require("natural");

var fs = require("fs");
var path = require("path");
var vietnamese_stopwords = fs.readFileSync(
  path.join(__dirname, "../vietnamese-stopwords/vietnamese-stopwords.txt"),
  "utf8"
);
var vietnamese_stopwords_dash = fs.readFileSync(
  path.join(__dirname, "../vietnamese-stopwords/vietnamese-stopwords-dash.txt"),
  "utf8"
);

const vietnamese_stopwords_list = vietnamese_stopwords
  .split("\n")
  .map(function (word) {
    return (word || "").trim();
  })
  .filter(function (word) {
    return word !== false && word.length > 0;
  });

const vietnamese_stopwords_dash_list = vietnamese_stopwords_dash
  .split("\n")
  .map(function (word) {
    return (word || "").trim();
  })
  .filter(function (word) {
    return word !== false && word.length > 0;
  });

const { TfIdf, PorterStemmer, NGrams } = natural;
const tokenizer = new natural.AggressiveTokenizerVi();

const defaultOptions = {
  maxVectorSize: 100,
  maxSimilarDocuments: Number.MAX_SAFE_INTEGER,
  minScore: 0,
  debug: false,
};

class ContentBasedRecommender {
  constructor(options = {}) {
    this.setOptions(options);

    this.data = {};
  }

  setOptions(options = {}) {
    // validation
    if (
      options.maxVectorSize !== undefined &&
      (!Number.isInteger(options.maxVectorSize) || options.maxVectorSize <= 0)
    ) {
      throw new Error(
        "The option maxVectorSize should be integer and greater than 0"
      );
    }

    if (
      options.maxSimilarDocuments !== undefined &&
      (!Number.isInteger(options.maxSimilarDocuments) ||
        options.maxSimilarDocuments <= 0)
    ) {
      throw new Error(
        "The option maxSimilarDocuments should be integer and greater than 0"
      );
    }

    if (
      options.minScore !== undefined &&
      (!_.isNumber(options.minScore) ||
        options.minScore < 0 ||
        options.minScore > 1)
    ) {
      throw new Error("The option minScore should be a number between 0 and 1");
    }

    this.options = Object.assign({}, defaultOptions, options);
  }

  train(documents) {
    this.validateDocuments(documents);

    if (this.options.debug) {
      console.log(`Total documents: ${documents.length}`);
    }
    this._preprocessDocuments(documents, this.options);
  }

  validateDocuments(documents) {
    if (!_.isArray(documents)) {
      throw new Error("Documents should be an array of objects");
    }

    for (let i = 0; i < documents.length; i += 1) {
      const document = documents[i];

      if (!_.has(document, "id") || !_.has(document, "content")) {
        throw new Error("Documents should be have fields id and content");
      }

      if (_.has(document, "tokens") || _.has(document, "vector")) {
        throw new Error(
          '"tokens" and "vector" properties are reserved and cannot be used as document properties"'
        );
      }
    }
  }

  // pseudo private methods

  _preprocessDocuments(documents, options) {
    if (options.debug) {
      console.log("Preprocessing documents");
    }

    const processedDocuments = documents.map((item) => {
      let tokens = this._getTokensFromString(item.content);
      return {
        id: item.id,
        tokens,
      };
    });

    return processedDocuments;
  }

  _getTokensFromString(string) {
    // remove html and to lower case
    const tmpString = striptags(string, [], " ").toLowerCase();
    // tokenize the string
    const tokens = tokenizer.tokenize(tmpString);
    console.log("tokens", tokens);
    // get unigrams
    const unigrams = this._removeStopwords(
      tokens,
      vietnamese_stopwords_list
    ).map((token) =>
      // stem the tokens
      PorterStemmer.stem(token)
    );
    // get bigrams
    const bigrams = NGrams.bigrams(tokens)
      .filter(
        (bigram) =>
          // filter terms with stopword
          bigram.length ===
          this._removeStopwords(bigram, vietnamese_stopwords_dash_list).length
      )
      .map((bigram) =>
        // stem the tokens
        bigram.map((token) => PorterStemmer.stem(token)).join(" ")
      );
    // get trigrams
    const trigrams = NGrams.trigrams(tokens)
      .filter(
        (trigram) =>
          // filter terms with stopword
          trigram.length === sw.removeStopwords(trigram, sw.vie).length
      )
      .map((trigram) =>
        // stem the tokens
        trigram.map((token) => PorterStemmer.stem(token)).join(" ")
      );
    console.log("unigrams", unigrams);
    console.log("bigrams", bigrams);
    console.log("trigrams", trigrams);
    return [].concat(unigrams, bigrams, trigrams);
  }

  _removeStopwords(tokens, stopwords) {
    return tokens.filter((token) => !stopwords.includes(token));
  }
}

module.exports = ContentBasedRecommender;
