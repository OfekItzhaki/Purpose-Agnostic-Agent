import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { PersonaService } from './persona.service.js';
import { PersonaEntity } from './entities/persona.entity.js';
import { PersonaController } from './persona.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([PersonaEntity]), CqrsModule],
  controllers: [PersonaController],
  providers: [PersonaService],
  exports: [PersonaService],
})
export class PersonaModule {}
