const config = require("./config.json");
const version = require("./version.json");
const fs = require("fs");

const eTag = config.ETag;
const distrib_config = config.DistributionConfig;
let lambda =
  distrib_config.DefaultCacheBehavior.LambdaFunctionAssociations.Items[0]
    .LambdaFunctionARN;
const lambda_split = lambda.split(":");
lambda_split[lambda_split.length - 1] = version.Version;
lambda = lambda_split.join(":");
distrib_config.DefaultCacheBehavior.LambdaFunctionAssociations.Items[0].LambdaFunctionARN =
  lambda;

fs.writeFile(process.env.ETAG, eTag, "utf-8", () => {
  console.log("ETAG 생성");
});

fs.writeFile(
  process.env.DISTRIBUTION_CLOUDFRONT_CONFIG,
  JSON.stringify(distrib_config),
  "utf-8",
  () => {
    console.log("Config 파일 생성");
  }
);
