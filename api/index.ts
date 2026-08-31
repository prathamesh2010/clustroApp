import { bootstrapServer } from '../apps/api/src/serverless';

export default async function handler(req: any, res: any) {
  const server = await bootstrapServer();
  return server(req, res);
}
