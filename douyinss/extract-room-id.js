function extractRoomId(url) {
    if (!url) return null;
    
    // 尝试从URL路径中提取（https://live.douyin.com/123456789012）
    const pathMatch = url.match(/live\.douyin\.com\/(\d+)/);
    if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
    }
    
    // 尝试从URL参数中提取（https://live.douyin.com/?room_id=123456789012）
    const paramMatch = url.match(/room_id=(\d+)/);
    if (paramMatch && paramMatch[1]) {
        return paramMatch[1];
    }
    
    // 尝试从短链接中提取
    const shortLinkMatch = url.match(/douyin\.com\/live\/(\d+)/);
    if (shortLinkMatch && shortLinkMatch[1]) {
        return shortLinkMatch[1];
    }
    
    return null;
}

// 测试不同格式的链接
const testUrls = [
    "https://live.douyin.com/123456789012",
    "https://live.douyin.com/?room_id=123456789012",
    "https://www.douyin.com/live/123456789012",
    "https://live.douyin.com/123456789012?other_param=value",
    "https://live.douyin.com/?room_id=123456789012&other_param=value",
    "https://live.douyin.com/570632639897?enter_from_merge=link_share&enter_method=copy_link_share&action_type=click&from=web_code_link",
    "https://live.douyin.com/343850341894?enter_from_merge=link_share&enter_method=copy_link_share&action_type=click&from=web_code_link"
];

console.log("测试提取room_id:");
testUrls.forEach(url => {
    const roomId = extractRoomId(url);
    console.log(`${url} -> room_id: ${roomId}`);
});

module.exports = { extractRoomId };