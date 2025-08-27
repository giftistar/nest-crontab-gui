import { PartialType } from '@nestjs/swagger';
import { CreateCronJobDto } from './create-cronjob.dto';

export class UpdateCronJobDto extends PartialType(CreateCronJobDto) {}