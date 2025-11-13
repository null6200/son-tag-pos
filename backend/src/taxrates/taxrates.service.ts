import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class TaxRatesService {
  notImplemented() { throw new NotImplementedException(); }
}
