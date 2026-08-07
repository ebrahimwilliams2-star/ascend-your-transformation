// ComparisonModalAndroid.kt
// Fullscreen comparison modal composable (simplified) with pinch-to-zoom and double-tap swap stub

package com.ascend.transform

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.res.painterResource

@Composable
fun ComparisonModalAndroid(isVisible: MutableState<Boolean>, beforeRes: Int, afterRes: Int) {
    if (!isVisible.value) return

    var scale by remember { mutableStateOf(1f) }
    var offsetX by remember { mutableStateOf(0f) }
    var slider by remember { mutableStateOf(0.5f) }

    Box(modifier = Modifier
        .fillMaxSize()
        .background(Color.Black)) {

        Box(modifier = Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    scale = (scale * zoom).coerceIn(1f, 4f)
                    offsetX += pan.x
                }
            }
        ) {
            Image(painter = painterResource(id = afterRes), contentDescription = null,
                modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)

            Box(modifier = Modifier
                .fillMaxHeight()
                .width((slider * 100).dp)) {
                Image(painter = painterResource(id = beforeRes), contentDescription = null,
                    modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            }

            // Divider
            Box(modifier = Modifier
                .width(3.dp)
                .fillMaxHeight()
                .background(Color.Red)
                .align(Alignment.CenterStart))
        }

        // Top actions
        Row(modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Spacer(modifier = Modifier.width(24.dp))
            // Close & share actions would go here
        }
    }
}
