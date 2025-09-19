
export const hasSubmittedForQuestion = (questionId: string): boolean => {
  const submitted = localStorage.getItem(`submitted_${questionId}`);
  return submitted === 'true';
};

export const recordSubmissionForQuestion = (questionId: string): void => {
  localStorage.setItem(`submitted_${questionId}`, 'true');
};
