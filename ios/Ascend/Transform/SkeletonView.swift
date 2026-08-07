import SwiftUI

// SkeletonView.swift
// Lightweight skeleton placeholders used while images and data load

struct SkeletonView: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color.gray.opacity(0.12))
            .shimmer()
    }
}

// Simple shimmer modifier
extension View {
    func shimmer() -> some View {
        self
            .overlay(
                LinearGradient(gradient: Gradient(colors: [Color.white.opacity(0.02), Color.white.opacity(0.06), Color.white.opacity(0.02)]), startPoint: .topLeading, endPoint: .bottomTrailing)
                    .blendMode(.overlay)
                    .mask(RoundedRectangle(cornerRadius: 12).fill(LinearGradient(gradient: Gradient(colors: [Color.black, Color.clear, Color.black]), startPoint: .leading, endPoint: .trailing)).rotationEffect(.degrees(20)))
            )
    }
}
