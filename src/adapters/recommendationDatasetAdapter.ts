import type { AdmissionMethod, DataStatus, StudentProfile, University, UniversityProgram } from '../types'
import type { HistoricalCutoffsDataset } from '../data/admissionsDataValidation'

export interface CanonicalAdmissionsData {
  universities: University[]
  programs: UniversityProgram[]
  historicalCutoffs: HistoricalCutoffsDataset
}

export interface RecommendationDatasetInput {
  profile: StudentProfile
  universities: University[]
  programs: UniversityProgram[]
}

/**
 * The shared program schema has one cutoff slot, while canonical history is
 * method-specific. Populate that slot only when the student explicitly chose
 * exactly one admission method and there is one unambiguous latest record.
 */
export function toRecommendationDataset(
  profile: StudentProfile,
  data: CanonicalAdmissionsData,
): RecommendationDatasetInput {
  const scoreMethod: AdmissionMethod = 'high_school_exam'
  const programs = data.programs.map((program) => {
    // Historical rows must also match a method currently declared for this program.
    // A historical academic-record cutoff must not imply that the current program
    // offers academic-record admission.
    if (!program.admissionMethods.some((item) => item.method === scoreMethod)) return program

    const matches = data.historicalCutoffs.records.filter((record) =>
      record.programId === program.id &&
      record.method === scoreMethod &&
      record.cutoffScore !== null &&
      record.scoreScale === 30,
    )
    if (matches.length === 0) return program

    const latestYear = Math.max(...matches.map((record) => record.year))
    const latest = matches.filter((record) => record.year === latestYear)
    // Never choose arbitrarily if the canonical dataset has duplicate latest rows.
    if (latest.length !== 1) return program

    const cutoff = latest[0]
    const status: DataStatus =
      program.status === 'simulated' || cutoff.status === 'simulated'
        ? 'simulated'
        : program.status === 'needs_review' || cutoff.status === 'needs_review'
          ? 'needs_review'
          : 'verified'

    const cutoffSource = cutoff.sourceUrl
      ? [{
          title: `Điểm chuẩn lịch sử (thi tốt nghiệp THPT) năm ${cutoff.year}`,
          url: cutoff.sourceUrl,
          applicableYear: cutoff.year,
          checkedAt: cutoff.checkedAt,
          status: cutoff.status,
        }]
      : []

    const sources = cutoffSource.length > 0 &&
      !program.sources.some((source) => source.url === cutoff.sourceUrl)
      ? [...program.sources, ...cutoffSource]
      : program.sources

    return {
      ...program,
      historicalCutoff: cutoff.cutoffScore,
      cutoffYear: cutoff.year,
      cutoffScale: cutoff.scoreScale,
      status,
      sources,
    }
  })

  return { profile, universities: data.universities, programs }
}
