import { Injectable, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { ProjectsService } from '../projects/projects.service';
import type { ImportResult } from '@sce/types';

const VALID_DOMAINS = ['organic', 'semi-detached', 'embedded'] as const;
const VALID_EXPERIENCE = ['very_low', 'low', 'nominal', 'high', 'very_high'] as const;

type Domain = (typeof VALID_DOMAINS)[number];
type ExperienceLevel = (typeof VALID_EXPERIENCE)[number];

interface CsvRow {
  name?: string;
  description?: string;
  domain?: string;
  size_kloc?: string;
  team_size?: string;
  experience_level?: string;
  actual_effort_pm?: string;
}

@Injectable()
export class DatasetService {
  constructor(private readonly projectsService: ProjectsService) {}

  async importFromCsv(fileBuffer: Buffer): Promise<ImportResult> {
    let records: CsvRow[];

    try {
      records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as CsvRow[];
    } catch {
      throw new BadRequestException('Failed to parse CSV file');
    }

    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2; // 1-indexed + header row
      const row = records[i];

      const validationError = this.validateRow(row, rowNum);
      if (validationError) {
        result.errors.push({ row: rowNum, message: validationError });
        result.skipped++;
        continue;
      }

      try {
        const actualEffortPm = row.actual_effort_pm
          ? parseFloat(row.actual_effort_pm)
          : undefined;

        await this.projectsService.create({
          name: row.name!.trim(),
          inputType: 'freetext',
          descriptionText: row.description!.trim(),
          domain: row.domain!.trim() as Domain,
          sizeKloc: parseFloat(row.size_kloc!),
          teamSize: parseInt(row.team_size!, 10),
          experienceLevel: row.experience_level!.trim() as ExperienceLevel,
          actualEffortPm,
        } as any);

        result.imported++;
      } catch {
        result.errors.push({ row: rowNum, message: 'Failed to save project' });
        result.skipped++;
      }
    }

    return result;
  }

  validateRow(row: CsvRow, rowNum: number): string | null {
    if (!row.name?.trim()) return `Row ${rowNum}: missing name`;
    if (!row.description?.trim()) return `Row ${rowNum}: missing description`;
    if (!VALID_DOMAINS.includes(row.domain?.trim() as Domain))
      return `Row ${rowNum}: invalid domain "${row.domain}"`;

    const sizeKloc = parseFloat(row.size_kloc ?? '');
    if (isNaN(sizeKloc) || sizeKloc <= 0)
      return `Row ${rowNum}: size_kloc must be a positive number`;

    const teamSize = parseInt(row.team_size ?? '', 10);
    if (isNaN(teamSize) || teamSize < 1 || teamSize > 500)
      return `Row ${rowNum}: team_size must be 1–500`;

    if (!VALID_EXPERIENCE.includes(row.experience_level?.trim() as ExperienceLevel))
      return `Row ${rowNum}: invalid experience_level "${row.experience_level}"`;

    if (row.actual_effort_pm) {
      const effort = parseFloat(row.actual_effort_pm);
      if (isNaN(effort) || effort <= 0)
        return `Row ${rowNum}: actual_effort_pm must be a positive number`;
    }

    return null;
  }
}
