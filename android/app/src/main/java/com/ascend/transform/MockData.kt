// MockData.kt
package com.ascend.transform

data class MockPhoto(
    val id: String,
    val url: String,
    val thumbUrl: String,
    val takenAt: String,
    val weight: Double?,
    val bodyFat: Double?,
    val journal: String?
)

val samplePhotos = listOf(
    MockPhoto("p1", "mock_before", "mock_thumb", "2026-01-01", 82.0, 24.0, "Finally committed."),
    MockPhoto("p2", "mock_after", "mock_thumb", "2026-03-01", 75.0, 18.0, "Best I've ever looked.")
)
