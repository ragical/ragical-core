import { getHostName } from "@a11ywatch/website-source-builder";
import type { Issue } from "@app/types";
import { pluralize } from "../utils";

export interface Data {
  issues: Issue[] | [];
  pageUrl: string;
}

export interface IssuesFound {
  (data: Data, headingElement?: string, hideFooter?: boolean): string;
}

// return issues as in table form
const issuesFoundTemplate: IssuesFound = (
  data = { issues: [], pageUrl: "" },
  headingElement = "h1",
  hideFooter = false
) => {
  let listData = "";
  const tdStyles = `style="border: 1px solid #ddd; padding: 6px;"`;
  const errorIssues = data?.issues || []; // display with limits for email generation

  if (errorIssues?.length) {
    // loop until
    errorIssues.some((item: Issue, i: number) => {
      if (i === 10) {
        return true;
      }
      listData = `${listData}<tr><td ${tdStyles}><code>${
        item?.context ?? "N/A"
      }</code></td><td ${tdStyles}>${item?.message ?? "N/A"}</td></tr>`;
      return false;
    });
  }

  const page = data?.pageUrl;
  const thStyles = `style="border: 1px solid #ddd; padding: 6px; padding-top: 12px; padding-bottom: 12px; text-align: left; background-color: #444c56; color: white;"`;

  const target = page; // TODO: use domain only
  let hostName;

  try {
    hostName = getHostName(target);
  } catch (e) {
    console.error(e);
  }

  let targetUrl = encodeURIComponent(target);

  const issueCount = data?.issues?.length;

  return `
    ${
      hideFooter
        ? `<head>
      <style>
        tr:nth-child(even){background-color: #f2f2f2;}
        tr:hover {background-color: #ddd;}
      </style>
    </head>`
        : ""
    }
    <${headingElement || "h1"}>${issueCount} ${pluralize(
    issueCount,
    "issue"
  )} found for ${page}</${headingElement || "h1"}>
    ${
      hideFooter
        ? ""
        : `<div style="margin-bottom: 12px; margin-top: 8px;">Login to see full report.</div>`
    }
    <div style="overflow:auto;">
      <table class="a11y-view" style="font-family: system-ui, Arial; border-collapse: collapse; table-layout: auto; width: 100%;">
        <tr>
          <th ${thStyles}>Element</th>
          <th ${thStyles}>Recommendation</th>
        </tr>
        ${listData}
      </table>
    </div>
    <a href="https://a11ywatch.com" style="font-weight: 800; font-size: 1.8em; display: block; background: #5c6bc0; padding: 8px; color: white; text-align: center; text-decoration: none;">View Full Details</a>
    <a href="https://a11ywatch.com/reports/${targetUrl}" style="font-weight: 800; font-size: 1.8em; display: block; background: #111; padding: 8px; color: #fff; text-align: center; text-decoration: none;">View Report</a>
    <a href="https://api.a11ywatch.com/api/get-website?q=${hostName}&download=true" style="font-weight: 800; font-size: 1.8em; display: block; background: #fff; padding: 8px; color: #000; text-align: center; text-decoration: none;">Download Report</a>
    ${
      hideFooter
        ? ""
        : `<p style="margin-top:10px; margin-bottom: 10px;">If you want to stop receiving emails toggle the alert setting to off on the dashboard</p>`
    }
`.trim();
};

export { issuesFoundTemplate };
