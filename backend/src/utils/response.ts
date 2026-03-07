import { Response } from 'express';

export const ok      = (res: Response, data: any, status = 200) =>
  res.status(status).json(data);

export const created = (res: Response, data: any) =>
  res.status(201).json(data);

export const noContent = (res: Response) =>
  res.status(204).send();
