const querystring = require("querystring"); // Don't install.
const AWS = require("aws-sdk"); // Don't install.
const Sharp = require("sharp");

const S3 = new AWS.S3({
  region: "ap-northeast-2",
});
const BUCKET = "webp-koalakid";
exports.handler = async (event, context, callback) => {
  const { request, response } = event.Records[0].cf;
  const params = querystring.parse(request.querystring); // Extract name and format.
  const { uri } = request;
  const [, imageName, extension] = uri.match(/\/?(.*)\.(.*)/);

  // Init variables
  let type;
  let s3Object;
  let resizedImage;
  let webpObject;
  let etag;
  type = params.type ? params.type : extension; // For AWS CloudWatch.
  console.log(`parmas: ${JSON.stringify(params)}`); // Cannot convert object to primitive value.
  console.log(`name: ${imageName}.${extension}`); // Favicon error, if name is `favicon.ico`.
  console.log("key: " + decodeURI("webp/" + imageName + ".webp"));
  console.log(decodeURI("webp/" + imageName + ".webp"));
  console.log(decodeURI(imageName + "." + extension));

  //webp 파일이 지정된 경로에 있는지 탐색
  try {
    const webpParams = {
      Bucket: BUCKET,
      Key: decodeURI("webp/" + imageName + ".webp"),
    };
    webpObject = await S3.getObject(webpParams).promise();
    etag = webpObject.ETag;
    //파일이 있는 경우 그대로 반환
    console.log("webp 이미지가 존재합니다.");
    //버퍼타입으로 반환하기
    try {
      resizedImage = await Sharp(webpObject.Body).toBuffer();
      console.log("변환 성공");
    } catch (error) {
      console.log("Sharp: ", error);
    }

    response.status = 200;
    response.body = resizedImage.toString("base64");
    response.bodyEncoding = "base64";
    response.headers["content-type"] = [
      {
        key: "Content-Type",
        value: "binary/octet-stream",
      },
    ];

    response.headers["cache-control"] = [
      {
        key: "Cache-Control",
        value: "public, max-age=2592000",
      },
    ];

    response.headers["content-disposition"] = [
      {
        key: "Content-Disposition",
        value: `attachment; filename=${imageName + ".webp"}`,
      },
    ];

    response.headers["etag"] = [
      {
        key: "etag",
        value: etag,
      },
    ];
    return response;
  } catch (error) {
    console.log("S3.getObject: ", error);
    console.log("지정된 webp 이미지가 없습니다.");
  }

  //버킷으로부터 파일 가져오기
  try {
    s3Object = await S3.getObject({
      Bucket: BUCKET,
      Key: decodeURI(imageName + "." + extension),
    }).promise();
    console.log("원본 파일이 존재합니다.");
  } catch (error) {
    console.log("S3.getObject: ", error);
    return callback(error);
  }

  //버킷에서 가져온 파일 변환하기
  try {
    resizedImage = await Sharp(s3Object.Body).webp().toBuffer();
    console.log("변환 성공");
  } catch (error) {
    console.log("Sharp: ", error);
    return callback(error);
  }
  const resizedImageByteLength = Buffer.byteLength(resizedImage, "base64");
  console.log("byteLength: ", resizedImageByteLength);

  //변환된 resizedImage 저장
  try {
    await S3.putObject({
      Bucket: BUCKET,
      Key: decodeURI("webp/" + imageName + ".webp"),
      Body: resizedImage,
      ContentType: "binary/octet-stream",
    }).promise();
    console.log("저장 성공");
  } catch (error) {
    console.log("S3.putObject: ", error);
    return callback(error);
  }

  try {
    const webpParams = {
      Bucket: BUCKET,
      Key: decodeURI("webp/" + imageName + ".webp"),
    };
    webpObject = await S3.getObject(webpParams).promise();
    etag = webpObject.ETag;
  } catch (error) {
    console.log("S3.getObject: ", error);
  }

  response.status = 200;
  response.body = resizedImage.toString("base64");
  response.bodyEncoding = "base64";
  response.headers["content-type"] = [
    {
      key: "Content-Type",
      value: "binary/octet-stream",
    },
  ];

  response.headers["cache-control"] = [
    {
      key: "Cache-Control",
      value: "public, max-age=2592000",
    },
  ];

  response.headers["content-disposition"] = [
    {
      key: "Content-Disposition",
      value: `attachment; filename=${imageName + ".webp"}`,
    },
  ];

  response.headers["etag"] = [
    {
      key: "etag",
      value: etag,
    },
  ];
  return response;
};
