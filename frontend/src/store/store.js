/**
 * Store central de Redux.
 * Slices: auth, chat, moodle (cursos/calificaciones), recommendations.
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer           from './slices/authSlice';
import chatReducer           from './slices/chatSlice';
import moodleReducer         from './slices/moodleSlice';
import recommendationReducer from './slices/recommendationSlice';

const store = configureStore({
  reducer: {
    auth:            authReducer,
    chat:            chatReducer,
    moodle:          moodleReducer,
    recommendations: recommendationReducer,
  },
});

export default store;
