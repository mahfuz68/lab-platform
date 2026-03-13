'use client'

interface LabStep {
  title: string
  instruction: string
  validation: string
}

interface LabStepsProps {
  steps: LabStep[]
  currentStep: number
  onValidate: () => void
}

export default function LabSteps({ steps, currentStep, onValidate }: LabStepsProps) {
  if (!steps.length) {
    return <p className="text-gray-500 text-sm">No steps available</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>Step {currentStep + 1} of {steps.length}</span>
        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${
              index === currentStep
                ? 'border-primary-500 bg-primary-50'
                : index < currentStep
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                index === currentStep
                  ? 'bg-primary-500 text-white'
                  : index < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {index < currentStep ? '✓' : index + 1}
              </span>
              <h4 className="font-medium text-sm">{step.title}</h4>
            </div>
            {index === currentStep && (
              <p className="text-sm text-gray-600 ml-8">{step.instruction}</p>
            )}
          </div>
        ))}
      </div>

      {currentStep < steps.length && (
        <button
          onClick={onValidate}
          className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Validate Step
        </button>
      )}

      {currentStep >= steps.length - 1 && (
        <div className="p-3 bg-green-100 text-green-700 rounded-lg text-center text-sm font-medium">
          Lab Completed! 🎉
        </div>
      )}
    </div>
  )
}
