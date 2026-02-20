const logger = require("../utils/logger.js");
const Search = require("../models/Search.js");

//----------------
//---SEARCH POSTS--
const searchPostController = async (req, res) => {
  logger.info("Search endpoint hit...");
  try {
    //---searching query--
    const { query } = req.query;
    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: {
          $meta: "textScore",
        },
      },
    )
      .sort({
        score: { $meta: "textScore" },
      })
      .limit(10);
    //---
    res.json(results);
  } catch (error) {
    logger.error("Error in searching posts", error);
    res.status(500).json({
      success: false,
      message: "Error in searching posts",
    });
  }
};

//---
module.exports = { searchPostController };
