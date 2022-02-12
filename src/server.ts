/*
 * Copyright (c) A11yWatch, LLC. and its affiliates.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 **/

import type { Server as HttpServer } from "http";
import type { AddressInfo } from "net";
import express from "express";
import http from "http";
import cors from "cors";
import createIframe from "node-iframe";
import { setConfig as setLogConfig } from "@a11ywatch/log";
import { CronJob } from "cron";
import { corsOptions, config, logServerInit, cookieConfigs } from "./config";
import { forkProcess, getUser } from "./core/utils";
import { crawlAllAuthedWebsites } from "./core/controllers/websites";
import { AnalyticsController } from "./core/controllers/analytics";
import { verifyUser } from "./core/controllers/users/update";
import { createIframe as createIframeEvent } from "./core/controllers/iframe";
import { AnnouncementsController } from "./core/controllers/announcements";
import { UsersController } from "./core/controllers/users";

import fetcher from "node-fetch";
import cookieParser from "cookie-parser";

import {
  CRAWL_WEBSITE,
  CONFIRM_EMAIL,
  IMAGE_CHECK,
  SCAN_WEBSITE_ASYNC,
  ROOT,
  WEBSITE_CRAWL,
  WEBSITE_CHECK,
  UNSUBSCRIBE_EMAILS,
  GET_WEBSITES_DAILY,
  ADD_SCRIPT,
  ADD_SCREENSHOT,
  DOWNLOAD_SCRIPT,
  GET_SCRIPT,
  GET_SCREENSHOT,
} from "./core/routes";
import { initDbConnection, closeDbConnection } from "./database";
import { Server } from "./apollo-server";
import {
  confirmEmail,
  crawlWebsite,
  detectImage,
  root,
  unSubEmails,
  scanWebsite,
  websiteCrawl,
  websiteCrawlAuthed,
  getWebsite,
  getDailyWebsites,
} from "./rest/routes";
import { createUser } from "./core/controllers/users/set";
import { logPage } from "./core/controllers/analytics/ga";
import { rawStatusBadge } from "./core/assets";

const { GRAPHQL_PORT } = config;

function initServer(): HttpServer {
  const app = express();

  app.use(cookieParser());
  app.use(cors(corsOptions));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json({ limit: "300mb" }));
  app.use(createIframe);
  app.set("trust proxy", true);
  app.options(CONFIRM_EMAIL, cors());
  app.options(WEBSITE_CHECK, cors());
  app.get(ROOT, root);
  app.get("/iframe", createIframeEvent);
  app.get("/api/get-website", cors(), getWebsite);
  app.get(GET_WEBSITES_DAILY, getDailyWebsites);
  app.get(UNSUBSCRIBE_EMAILS, cors(), unSubEmails);
  app.post(WEBSITE_CRAWL, cors(), websiteCrawl);
  app.post(`${WEBSITE_CRAWL}-background`, async (req, res) => {
    try {
      if (typeof process.env.BACKGROUND_CRAWL !== "undefined") {
        forkProcess({ req: { body: req.body, pubsub: true } }, "crawl-website");
        res.json(true);
      } else {
        await websiteCrawl(req, res);
      }
    } catch (e) {
      res.json(false);
    }
  });
  app.post(CRAWL_WEBSITE, cors(), crawlWebsite);
  app.post(SCAN_WEBSITE_ASYNC, cors(), scanWebsite);
  app.post(IMAGE_CHECK, cors(), detectImage);
  app.route(WEBSITE_CHECK).get(websiteCrawlAuthed).post(websiteCrawlAuthed);
  app.route(CONFIRM_EMAIL).get(cors(), confirmEmail).post(cors(), confirmEmail);

  // CDN SERVER TODO
  app.get(GET_SCRIPT, async (req, res) => {
    try {
      const request = await fetcher(
        `${String(process.env.SCRIPTS_CDN_URL).replace("api", "cdn")}/${
          req.params.domain
        }/${req.params.cdnPath}`,
        {
          method: "GET",
        }
      );
      const data = await request.text();

      return res.send(data);
    } catch (error) {
      console.error(error);
    }
  });
  app.get(GET_SCREENSHOT, async (req, res) => {
    try {
      const request = await fetcher(
        `${String(process.env.SCRIPTS_CDN_URL).replace("api", "screenshots")}/${
          req.params.domain
        }/${req.params.cdnPath}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await request.text();

      return res.send(data);
    } catch (error) {
      console.error(error);
    }
  });
  app.get(DOWNLOAD_SCRIPT, async (req, res) => {
    try {
      const request = await fetcher(
        `${String(process.env.SCRIPTS_CDN_URL).replace("api", "download")}/${
          req.params.domain
        }/${req.params.cdnPath}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await request.text();

      return res.send(data);
    } catch (error) {
      console.error(error);
    }
  });
  app.post(ADD_SCRIPT, async (req, res) => {
    try {
      const request = await fetcher(
        `${process.env.SCRIPTS_CDN_URL}/add-script`,
        {
          method: "POST",
          body: req.body ? JSON.stringify(req.body) : null,
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await request.text();

      return res.send(data);
    } catch (error) {
      console.error(error);
    }
  });
  app.post(ADD_SCREENSHOT, async (req, res) => {
    try {
      const request = await fetcher(
        `${process.env.SCRIPTS_CDN_URL}/add-screenshot`,
        {
          method: "POST",
          body: req.body ? JSON.stringify(req.body) : null,
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await request.text();

      return res.send(data);
    } catch (e) {
      console.error(e);
    }
  });

  // AUTH ROUTES
  app.post("/api/register", cors(), async (req, res) => {
    const { email, password, googleId } = req.body;
    try {
      const auth = await createUser({ email, password, googleId });

      res.cookie("on", auth.email, cookieConfigs);
      res.cookie("jwt", auth.jwt, cookieConfigs);

      res.json(auth);
    } catch (e) {
      res.json({
        data: null,
        message: e?.message,
      });
    }
  });
  app.post("/api/login", cors(), async (req, res) => {
    const { email, password, googleId } = req.body;
    try {
      const auth = await verifyUser({ email, password, googleId });

      res.cookie("on", auth.email, cookieConfigs);
      res.cookie("jwt", auth.jwt, cookieConfigs);

      res.json(auth);
    } catch (e) {
      console.error(e);
      res.json({
        data: null,
        message: e?.message,
      });
    }
  });

  app.post("/api/ping", cors(), async (req, res) => {
    const token = req.cookies.jwt;
    const parsedToken = getUser(token);
    const id = parsedToken?.payload?.keyid;

    if (typeof id !== "undefined") {
      const [user, collection] = await UsersController().getUser({ id }, true);

      if (user) {
        await collection.updateOne(
          { id },
          {
            $set: {
              lastLoginDate: new Date(),
            },
          }
        );
      }
      res.send(true);
    } else {
      res.send(true);
    }
  });

  app.post("/api/logout", cors(), async (_req, res) => {
    res.clearCookie("on");
    res.clearCookie("jwt");
    res.send(true);
  });

  // ADMIN ROUTES
  app.post("/api/run-watcher", cors(), async (req, res) => {
    const { password } = req.body;
    try {
      if (password === process.env.ADMIN_PASSWORD) {
        await crawlAllAuthedWebsites();
        res.send(true);
      } else {
        res.send(false);
      }
    } catch (e) {
      console.error(e);
    }
  });

  app.get("/api/whats-new", cors(), async (_, res) => {
    try {
      const [announcements] = await AnnouncementsController().getAnnouncement(
        { _id: null },
        true
      );

      res.json({
        data: announcements ?? null,
        message: process.env.WHATS_NEW ?? "No new announcements",
      });
    } catch (e) {
      console.error(e);
    }
  });

  /* Queue
     start of jobs and queues
  */

  app.post(`${WEBSITE_CRAWL}-start`, async (req, res) => {
    // TODO: add website from inprogress scanning preventing re-jobs
    res.json({ ok: true });
  });

  app.post(`${WEBSITE_CRAWL}-complete`, async (req, res) => {
    // TODO: unqueue website from inprogress scanning
    res.json({ ok: true });
  });

  app.post(`${WEBSITE_CRAWL}-background-start`, async (req, res) => {
    // TODO: add website from inprogress scanning preventing re-jobs
    res.json({ ok: true });
  });

  app.post(`${WEBSITE_CRAWL}-background-complete`, async (req, res) => {
    // TODO: unqueue website from inprogress scanning
    res.json({ ok: true });
  });

  /* End of Queue */

  /*  ANALYTICS */
  app.post("/api/log/page", cors(), logPage);
  /*  END OF ANALYTICS */

  // TODO: SAVE IMAGE IF USAGE OF FEATURE BECOMES PROMINENT IN WATCHER STEP
  app.get("/status/:domain", cors(), async (req, res) => {
    res.setHeader("Content-Type", "image/svg+xml");
    const domain = req.params.domain.replace(".svg", "");
    const website = await AnalyticsController().getWebsite({ domain }, false);
    const score = website?.adaScore;
    let statusColor = "#000";

    if (score < 70) {
      statusColor = "#f85149";
    } else if (score >= 70 && score < 90) {
      statusColor = "#a4a61d";
    } else if (score >= 90) {
      statusColor = "#3fb950";
    }

    res.send(rawStatusBadge({ statusColor, score }));
  });

  // INTERNAL
  app.get("/_internal_/healthcheck", cors(), async (_, res) => {
    res.send({
      status: "healthy",
    });
  });

  //An error handling middleware
  app.use(function (err, _req, res, next) {
    if (res.headersSent) {
      return next(err);
    }
    res.status(500);
    res.json({ error: err });
  });

  const server = new Server();

  server.applyMiddleware({ app, cors: corsOptions });

  const httpServer = http.createServer(app);

  server.installSubscriptionHandlers(httpServer);

  const listener = httpServer.listen(GRAPHQL_PORT);

  logServerInit((listener.address() as AddressInfo).port, {
    subscriptionsPath: server.subscriptionsPath,
    graphqlPath: server.graphqlPath,
  });

  if (process.env.DYNO === "web.1" || !process.env.DYNO) {
    new CronJob("00 00 00 * * *", crawlAllAuthedWebsites).start();
  }

  return listener;
}

let coreServer: HttpServer;

const startServer = (async () => {
  setLogConfig({
    container: "api",
    disabled: process.env.LOGGER_ENABLED === "true" ? false : true,
  });

  try {
    await initDbConnection();
  } catch (e) {
    console.error(e);
  }
  try {
    coreServer = await initServer();
  } catch (e) {
    console.error(["SERVER FAILED TO START", e]);
  }
})();

const killServer = async () => {
  try {
    await Promise.all([closeDbConnection(), coreServer.close()]);
  } catch (e) {
    console.error("failed to kill server", e);
  }
};

export { killServer, initServer, startServer };
export default coreServer;
