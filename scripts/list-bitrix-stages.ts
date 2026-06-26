import { loadProjectDotEnv } from '../src/lib/cli/load-dotenv';

async function main(): Promise<void> {
  loadProjectDotEnv();
  const webhookUrl = process.env.BITRIX_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('BITRIX_WEBHOOK_URL missing');
  }

  const base = webhookUrl.replace(/\/$/, '');

  const categoryRes = await fetch(`${base}/crm.dealcategory.stage.list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 0 }),
  });
  const categoryBody = (await categoryRes.json()) as {
    result?: Array<{ STATUS_ID: string; NAME: string; SORT?: string }>;
    error?: string;
  };

  console.log('crm.dealcategory.stage.list (category 0)');
  if (categoryBody.error) {
    console.log('error:', categoryBody.error);
  }

  for (const stage of categoryBody.result ?? []) {
    console.log(`${stage.STATUS_ID}\t${stage.NAME}\t(sort ${stage.SORT ?? '?'})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
