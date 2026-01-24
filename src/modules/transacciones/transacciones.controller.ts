import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { TransaccionesService } from './transacciones.service';
import { CreateTransaccionDto, UpdateTransaccionDto } from './transacciones.dto';

@Controller('transacciones')
export class TransaccionesController {
  constructor(private readonly service: TransaccionesService) {}

  @Post()
  create(@Body() dto: CreateTransaccionDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Body() dto: UpdateTransaccionDto) {
    return this.service.update(dto.id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
