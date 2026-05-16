/**
 * Store central de Redux con los 4 slices de SIRA.
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer           from './slices/authSlice';
import chatReducer           from './slices/chatSlice';
import profileReducer        from './slices/profileSlice';
import recommendationReducer from './slices/recommendationSlice';

const store = configureStore({
  reducer: {
    auth:            authReducer,
    chat:            chatReducer,
    profile:         profileReducer,
    recommendations: recommendationReducer,
  },
});

export default store;
