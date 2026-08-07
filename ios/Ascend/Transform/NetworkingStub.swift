import Foundation

// NetworkingStub.swift
// Minimal stub to simulate upload signed URL and Ethan analysis enqueue for development

struct UploadSignedURLResponse: Codable {
    let uploadUrl: String
    let assetUrl: String
}

class NetworkingStub {
    static func requestSignedUploadURL(completion: @escaping (UploadSignedURLResponse) -> Void) {
        // Return mock signed URL and permanent asset URL (development only)
        let response = UploadSignedURLResponse(uploadUrl: "https://example.com/upload/signed-url", assetUrl: "https://cdn.example.com/assets/mock.jpg")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            completion(response)
        }
    }

    static func enqueueEthanAnalysis(photoId: String, completion: @escaping (String) -> Void) {
        // Return mock analysis id
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            completion("mock-1")
        }
    }
}
