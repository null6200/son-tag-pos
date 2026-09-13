import { Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

// Compatibility guard: reuse JWT auth where controllers still reference SupabaseAuthGuard
@Injectable()
export class SupabaseAuthGuard extends JwtAuthGuard {}
