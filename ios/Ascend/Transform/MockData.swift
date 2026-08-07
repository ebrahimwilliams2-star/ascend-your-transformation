// MockData.swift
// Local mock data and helpers for iOS preview and development

import Foundation

struct MockPhoto: Identifiable {
    let id: String
    let url: String
    let thumbUrl: String
    let takenAt: Date
    let weight: Double?
    let bodyFat: Double?
    let journal: String?
}

let samplePhotos: [MockPhoto] = [
    MockPhoto(id: "p1", url: "mock_before", thumbUrl: "mock_thumb", takenAt: Date(), weight: 82, bodyFat: 24, journal: "Finally committed."),
    MockPhoto(id: "p2", url: "mock_after", thumbUrl: "mock_thumb", takenAt: Date(), weight: 75, bodyFat: 18, journal: "Best I've ever looked.")
]
