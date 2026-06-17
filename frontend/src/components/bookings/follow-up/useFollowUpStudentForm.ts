import React, { useState } from 'react'
import type { Booking } from '@/types'
import { useDefaultBookingQuestions } from '@/hooks/queries/useSystemSettings'

export interface FollowUpStudentInfo {
  notes: string
  specificQuestion: string
  triedSolutions: string
  usedResources: string
  sessionObjectives: string
  customAnswers?: string[]
}

const EMPTY_STUDENT_INFO: FollowUpStudentInfo = {
  notes: '',
  specificQuestion: '',
  triedSolutions: '',
  usedResources: '',
  sessionObjectives: '',
  customAnswers: [],
}

/**
 * Owns the follow-up registration form state: the student-info fields, the
 * effective question set (event custom questions take precedence over system
 * defaults), the open-time reset, and the field/answer change handlers.
 */
export function useFollowUpStudentForm(isOpen: boolean, booking: Booking | null) {
  const [studentInfo, setStudentInfo] = useState<FollowUpStudentInfo>(EMPTY_STUDENT_INFO)

  const { data: systemDefaultQuestions = [] } = useDefaultBookingQuestions({ enabled: isOpen })

  // Resolve effective questions: custom questions take precedence when explicitly configured.
  // Falls back to system defaults, which may be empty (questions section is then hidden).
  const effectiveQuestions =
    booking?.event &&
    booking.event.useDefaultQuestions === false &&
    booking.event.customQuestions.length > 0
      ? booking.event.customQuestions
      : systemDefaultQuestions.map((q) => q.text)

  React.useEffect(() => {
    if (isOpen && booking?.event) {
      setStudentInfo({
        notes: '',
        specificQuestion: '',
        triedSolutions: '',
        usedResources: '',
        sessionObjectives: '',
        customAnswers: Array(effectiveQuestions.length).fill(''),
      })
    }
    // effectiveQuestions identity changes when the dialog opens and data loads; isOpen + booking are the triggers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, booking])

  const handleCustomAnswerChange =
    (index: number) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newAnswers = [...(studentInfo.customAnswers || [])]
      for (let i = 0; i <= index; i++) {
        if (newAnswers[i] === undefined) {
          newAnswers[i] = ''
        }
      }
      newAnswers[index] = e.target.value
      setStudentInfo({ ...studentInfo, customAnswers: newAnswers })
    }

  const handleFormChange =
    (field: keyof FollowUpStudentInfo) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setStudentInfo({ ...studentInfo, [field]: e.target.value })
    }

  const resetStudentInfo = () => setStudentInfo(EMPTY_STUDENT_INFO)

  return {
    studentInfo,
    effectiveQuestions,
    handleCustomAnswerChange,
    handleFormChange,
    resetStudentInfo,
  }
}
