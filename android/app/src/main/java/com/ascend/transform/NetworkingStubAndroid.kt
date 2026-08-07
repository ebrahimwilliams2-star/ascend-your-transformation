// NetworkingStubAndroid.kt
package com.ascend.transform

import kotlinx.coroutines.delay

object NetworkingStubAndroid {
    suspend fun requestSignedUploadUrl(): Pair<String, String> {
        // Return (uploadUrl, assetUrl)
        delay(400)
        return Pair("https://example.com/upload/signed-url", "https://cdn.example.com/assets/mock.jpg")
    }

    suspend fun enqueueEthanAnalysis(photoId: String): String {
        delay(800)
        return "mock-1"
    }
}
