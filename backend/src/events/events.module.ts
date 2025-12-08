import { Module, Global } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';

/**
 * Global module for real-time event broadcasting.
 * 
 * Marked as @Global so EventsService can be injected into any service
 * without needing to import EventsModule everywhere.
 */
@Global()
@Module({
  providers: [EventsGateway, EventsService],
  exports: [EventsService],
})
export class EventsModule {}
