import { connect } from "../../../../database";
import { getHostName, websiteSearchParams } from "../../../utils";
import type { Issue } from "../../../../types/schema";

export const getIssue = async (
  { url, pageUrl, userId, noRetries }: any,
  chain?: boolean
) => {
  const [collection] = await connect("Issues");

  const queryUrl = decodeURIComponent(String(url || pageUrl));

  const searchProps = websiteSearchParams({
    pageUrl: queryUrl,
    userId,
  });

  // todo: set default type
  let issue;

  // TODO: remove props and allow all
  if (Object.keys(searchProps).length) {
    issue = await collection.findOne(searchProps);

    // get issues from general bucket
    if (!issue && !noRetries) {
      issue = await collection.findOne({ pageUrl: queryUrl });
    }

    if (!issue && !noRetries) {
      issue = await collection.findOne({
        domain: getHostName(queryUrl),
      });
    }
  }

  return chain ? [issue, collection] : issue;
};

// query issue collection by limit
export const getIssues = async (
  {
    userId,
    domain,
    pageUrl,
  }: { userId: number; domain?: string; pageUrl?: string },
  limit: number = 2000
) => {
  const [collection] = await connect("Issues");
  const searchProps = websiteSearchParams({
    domain: domain || getHostName(pageUrl),
    userId,
  });

  // todo: PAGINATION
  return await collection
    .find(searchProps)
    .sort({ pageUrl: 1 })
    .limit(limit)
    .toArray();
};

// get issues for a user with pagination offsets.
export const getIssuesPaging = async (params) => {
  const [collection] = await connect("Issues");
  const { userId, domain, pageUrl, limit = 20, offset = 0, all } = params ?? {};

  const searchParams = websiteSearchParams({
    domain: domain || getHostName(pageUrl),
    userId,
    all,
  });

  const issues = (await collection
    .find(searchParams)
    .skip(offset)
    .limit(limit)
    .toArray()) as Issue[];

  return issues;
};
