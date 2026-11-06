export type ModuleType = 'numeric' | 'status';
export type StatusValidation = 'Acquis' | 'Non acquis' | 'En cours';

export const STATUS_OPTIONS: StatusValidation[] = ['Acquis', 'En cours', 'Non acquis'];

export interface Module {
  id: string;
  user_id: string;
  code: string;
  name: string;
  coefficient: number;
  type: ModuleType;
  periods?: number | null;
  status_validation: StatusValidation | null;
  created_at: string;
}

export interface Grade {
  id: string;
  module_id: string;
  user_id: string;
  title: string;
  value: number;
  weight: number;
  date: string | null;
  remarks: string | null;
  created_at: string;
}

export type ModuleInput = Pick<
  Module,
  'code' | 'name' | 'coefficient' | 'type' | 'periods' | 'status_validation'
>;

export type GradeInput = Pick<
  Grade,
  'module_id' | 'title' | 'value' | 'weight' | 'date' | 'remarks'
>;
