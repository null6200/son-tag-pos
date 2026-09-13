import { Injectable } from '@nestjs/common';

// Prisma-only mode: provide a stub service to avoid importing '@supabase/supabase-js'.
@Injectable()
export class SupabaseService {
  get client() {
    return null;
  }
}