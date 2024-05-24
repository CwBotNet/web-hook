import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env!.NOTION_TOKEN });

async function storeTokenInNotion(token: string) {
  await notion.pages.create({
    parent: { database_id: `${process.env!.NOTION_DB_ID}` },
    properties: {
      Name: { title: [{ text: { content: "Twitter Access Token" } }] },
      AccessToken: { rich_text: [{ text: { content: token } }] },
    },
  });
}

export { storeTokenInNotion };
