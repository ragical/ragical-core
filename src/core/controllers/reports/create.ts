/*
 * Copyright (c) A11yWatch, LLC. and its affiliates.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 **/
import { connect } from "@app/database";
import { issueSort } from "@app/core/utils";
import type { Issue, Website } from "@app/types";

export const createReport = async (website: Website, issues: Issue) => {
  try {
    const [collection] = await connect("Reports");
    const issue = website?.issues?.length
      ? website.issues
      : issues?.issues ?? (issues as Issue[]);

    const report = {
      timestamp: website?.timestamp || new Date().getTime(),
      url: website?.url,
      website: {
        ...website,
        issues: Array.isArray(issue)
          ? typeof issue?.sort === "function"
            ? issue?.sort(issueSort)
            : issue
          : issue,
      },
    };

    return await collection.insertOne(report);
  } catch (e) {
    console.error(e);
  }
};
