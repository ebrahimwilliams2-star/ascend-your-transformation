// TransformActivity.kt
// Android scaffold using Jetpack Compose

package com.ascend.transform

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp

class TransformActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Box(modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)) {
                    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                        TransformationHeroAndroid()
                        Spacer(modifier = Modifier.height(16.dp))
                        TimelineSectionAndroid()
                    }
                }
            }
        }
    }
}

@Composable
fun TransformationHeroAndroid() {
    var slider by remember { mutableStateOf(0.5f) }
    Box(modifier = Modifier
        .fillMaxWidth()
        .height(300.dp)
    ) {
        Image(
            painter = painterResource(id = R.drawable.mock_after),
            contentDescription = "After",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
        Box(modifier = Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectDragGestures { change, dragAmount ->
                    // rudimentary drag to update slider (preview only)
                }
            }) {
            // Before image masked by slider - simplified for scaffold
            Image(
                painter = painterResource(id = R.drawable.mock_before),
                contentDescription = "Before",
                modifier = Modifier.fillMaxSize().width((slider * 100).dp),
                contentScale = ContentScale.Crop
            )
            // Divider
            Box(modifier = Modifier
                .width(2.dp)
                .fillMaxHeight()
                .background(Color.Red)
                .align(Alignment.CenterStart))
        }
    }
}

@Composable
fun TimelineSectionAndroid() {
    Column {
        Text(text = "Progress Timeline", color = Color.White)
        Spacer(modifier = Modifier.height(8.dp))
        TimelineCardAndroid()
        TimelineCardAndroid()
    }
}

@Composable
fun TimelineCardAndroid() {
    Row(modifier = Modifier
        .fillMaxWidth()
        .padding(8.dp)
        .background(Color(0x0AFFFFFF))) {
        Image(painter = painterResource(id = R.drawable.mock_thumb), contentDescription = null,
            modifier = Modifier.size(80.dp))
        Column(modifier = Modifier.padding(start = 8.dp)) {
            Text(text = "Week 4", color = Color.White)
            Text(text = "79kg — Feeling stronger.", color = Color.Gray)
        }
    }
}
