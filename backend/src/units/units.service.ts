import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class UnitsService {
  notImplemented() { throw new NotImplementedException(); }
}
