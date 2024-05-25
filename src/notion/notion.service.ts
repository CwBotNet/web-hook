import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env!.NOTION_TOKEN });

interface Token {
  AccessToken: string;
  refreshToken: string;
}

async function storeTokenInNotion({ AccessToken, refreshToken }: Token) {
  await notion.pages.create({
    parent: { database_id: `${process.env!.NOTION_DB_ID}` },
    properties: {
      Name: { title: [{ text: { content: "Twitter Access Token" } }] },
      AccessToken: { rich_text: [{ text: { content: AccessToken } }] },
      refreshToken: { rich_text: [{ text: { content: refreshToken } }] },
    },
  });
}

export { storeTokenInNotion };
