import {
  pageMindClient,
  crawlerClient,
  mavClient,
  cdnClient,
} from "../website-client";
import type { PageMindScanResponse } from "../../types/schema";

// params to perform website scans
export interface ScanRpcParams {
  url: string;
  userId?: number;
  pageHeaders?: any[];
  pageInsights?: boolean;
  noStore?: boolean; // prevent storing values to CDN server
  scriptsEnabled?: boolean; // scripts storing enabled for user
  mobile?: boolean; // is the testing done in mobile view port
  standard?: string; // is the testing done in mobile view port
  ua?: string; // is the testing done in mobile view port
  actions?: string[]; // perform actions before testing
  cv?: boolean; // can use computer vision
  pageSpeedApiKey?: string; // the PageSpeed api key to use for request
  html?: string; // raw HTML to validate
  firefox?: boolean; // experimental todo: work outside local containers
  ignore?: string[]; // ignore list of errors
}

// perform scan to gRPC -> pagemind for website issues
export const scan = (
  website?: ScanRpcParams
): Promise<PageMindScanResponse> => {
  return new Promise((resolve, reject) => {
    pageMindClient.scan(website || {}, (error, res) => {
      if (!error) {
        resolve(res);
      } else {
        reject(error);
      }
    });
  });
};

// start scan job from crawler and gather links as found
export const crawlerScan = (website = {}) => {
  return new Promise((resolve, reject) => {
    crawlerClient.scan(website, (error, res) => {
      if (!error) {
        resolve(res);
      } else {
        reject(error);
      }
    });
  });
};

// start scan job from crawler and wait for all links to be found
export const crawlerCrawl = (website = {}) => {
  return new Promise((resolve, reject) => {
    crawlerClient.crawl(website, (error, res) => {
      if (!error) {
        resolve(res);
      } else {
        reject(error);
      }
    });
  });
};

// store script into s3 | local
export const setScript = (website = {}) => {
  return new Promise((resolve, reject) => {
    pageMindClient.setScript(website, (error, res) => {
      if (!error) {
        resolve(res);
      } else {
        reject(error);
      }
    });
  });
};

// parse an image to base64 -> mav service
const parseImg = (img = {}) => {
  return new Promise((resolve, reject) => {
    mavClient.parseImg(img, (error, res) => {
      if (!error) {
        resolve(res);
      } else {
        reject(error);
      }
    });
  });
};

const removeScript = (website = {}) => {
  return new Promise((resolve, reject) => {
    cdnClient.removeScript(website, (error, res) => {
      if (!error) {
        resolve(res);
      } else {
        reject(error);
      }
    });
  });
};

export const controller = {
  scan,
  crawlerScan,
  crawlerCrawl,
  setScript,
  parseImg,
  removeScript,
};
