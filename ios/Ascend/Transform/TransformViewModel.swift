// TransformViewModel.swift
// Simple ViewModel + Count-up helpers for Transform feature (iOS)

import Foundation
import Combine

final class TransformViewModel: ObservableObject {
    @Published var days: Int = 0
    @Published var startWeight: Double = 0
    @Published var currentWeight: Double = 0
    @Published var xp: Int = 0

    private var timer: AnyCancellable?

    // Target values (mocked for scaffold)
    private let targetDays = 124
    private let targetStartWeight = 82.0
    private let targetCurrentWeight = 75.0
    private let targetXP = 7400

    func animateToTargets() {
        // Cancel any existing timer
        timer?.cancel()

        // Use a 1.2s animation via Combine to increment values smoothly
        let duration: TimeInterval = 1.2
        let steps = 60
        var step = 0

        timer = Timer.publish(every: duration / Double(steps), on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                guard let self = self else { return }
                step += 1
                let progress = Double(step) / Double(steps)
                self.days = Int(Double(self.targetDays) * progress)
                self.startWeight = self.targetStartWeight // keep static (could animate too)
                self.currentWeight = Double(round( (self.targetCurrentWeight * progress) * 10) / 10)
                self.xp = Int(Double(self.targetXP) * progress)

                if step >= steps {
                    self.timer?.cancel()
                    self.days = self.targetDays
                    self.startWeight = self.targetStartWeight
                    self.currentWeight = self.targetCurrentWeight
                    self.xp = self.targetXP
                }
            }
    }
}
