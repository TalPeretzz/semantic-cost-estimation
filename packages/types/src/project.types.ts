export type DomainType = 'organic' | 'semi-detached' | 'embedded';
export type ExperienceLevel = 'very_low' | 'low' | 'nominal' | 'high' | 'very_high';
export type InputType = 'freetext' | 'structured';

export interface Project {
  id: string;
  name: string;
  inputType: InputType;
  descriptionText: string | null;
  descriptionJson: Record<string, string> | null;
  domain: DomainType;
  sizeKloc: number;
  teamSize: number;
  experienceLevel: ExperienceLevel;
  actualEffortPm: number | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateProjectInput = {
  name: string;
  domain: DomainType;
  sizeKloc: number;
  teamSize: number;
  experienceLevel: ExperienceLevel;
  actualEffortPm?: number;
} & (
  | { inputType: 'freetext'; descriptionText: string; descriptionJson?: never }
  | { inputType: 'structured'; descriptionJson: Record<string, string>; descriptionText?: never }
);
