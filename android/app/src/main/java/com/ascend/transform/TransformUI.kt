package com.ascend.transform

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing

class TransformViewModelAndroid : ViewModel() {
    var days by mutableStateOf(0)
    var startWeight by mutableStateOf(82.0)
    var currentWeight by mutableStateOf(75.0)
    var xp by mutableStateOf(0)

    fun animateToTargets() {
        val targetDays = 124
        val targetXP = 7400
        viewModelScope.launch {
            val steps = 60
            for (i in 1..steps) {
                days = (targetDays * i / steps)
                xp = (targetXP * i / steps)
                currentWeight = 75.0 // static for now
                delay(20)
            }
        }
    }
}

@Composable
fun TransformationHeroAndroid(viewModel: TransformViewModelAndroid) {
    var slider by remember { mutableStateOf(0.5f) }
    var scale by remember { mutableStateOf(1f) }

    Column {
        Box(modifier = Modifier
            .fillMaxWidth()
            .height(320.dp)
            .pointerInput(Unit) {
                detectTransformGestures { _, _, zoom, _ ->
                    scale = (scale * zoom).coerceIn(1f, 3f)
                }
            }
        ) {
            Image(
                painter = painterResource(id = R.drawable.mock_after),
                contentDescription = "After",
                modifier = Modifier
                    .fillMaxSize()
                    .scale(scale),
                contentScale = ContentScale.Crop
            )
            // Simplified: overlay before image width controlled by slider
            Box(modifier = Modifier
                .fillMaxHeight()
                .width((slider * 100).dp)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.mock_before),
                    contentDescription = "Before",
                    modifier = Modifier
                        .fillMaxSize()
                        .scale(scale),
                    contentScale = ContentScale.Crop
                )
            }
            Box(modifier = Modifier
                .width(3.dp)
                .fillMaxHeight()
                .background(Color.Red)
                .align(Alignment.CenterStart))
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatPillAndroid(title = "Days", value = viewModel.days)
            StatPillAndroid(title = "Start", value = viewModel.startWeight.toInt())
            StatPillAndroid(title = "Current", value = viewModel.currentWeight.toInt())
            StatPillAndroid(title = "XP", value = viewModel.xp)
        }
    }
}

@Composable
fun StatPillAndroid(title: String, value: Int) {
    Column(modifier = Modifier
        .background(Color(0x0AFFFFFF))
        .padding(8.dp), horizontalAlignment = Alignment.Start) {
        Text(text = title, color = Color.LightGray)
        Text(text = "$value", color = Color.White)
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
    ) {
        Image(painter = painterResource(id = R.drawable.mock_thumb), contentDescription = null,
            modifier = Modifier.size(80.dp))
        Column(modifier = Modifier.padding(start = 8.dp)) {
            Text(text = "Week 4", color = Color.White)
            Text(text = "79kg — Feeling stronger.", color = Color.Gray)
        }
    }
}
