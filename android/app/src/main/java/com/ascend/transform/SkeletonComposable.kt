// SkeletonComposable.kt
// Simple skeleton placeholders for Android compose

package com.ascend.transform

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun SkeletonBox(modifier: Modifier = Modifier) {
    Box(modifier = modifier
        .background(Color(0x1AFFFFFF))) {
        // Placeholder shimmer can be added with accompanist shimmer if desired
    }
}
