/**
 * 加密工具
 * 用于加密/解密敏感数据（如 API Key）
 */

import * as crypto from 'crypto';

// 使用机器特定信息生成密钥，增加安全性
const getMachineKey = (): string => {
  // 组合多个机器特定信息生成密钥
  const components = [
    process.env.USERNAME || process.env.USER || 'default-user',
    process.env.COMPUTERNAME || process.env.HOSTNAME || 'default-host',
    'ai-writer-secret-salt-v1', // 应用特定的盐值
  ];
  return components.join('-');
};

// 从字符串生成固定长度的密钥
const deriveKey = (input: string): Buffer => {
  return crypto.createHash('sha256').update(input).digest();
};

// 加密算法配置
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * 加密文本
 * @param text 要加密的文本
 * @returns 加密后的字符串（base64 编码）
 */
export function encrypt(text: string): string {
  try {
    // 生成随机盐值
    const salt = crypto.randomBytes(SALT_LENGTH);

    // 使用盐值和机器密钥派生加密密钥
    const key = crypto.pbkdf2Sync(
      getMachineKey(),
      salt,
      100000, // 迭代次数
      32,
      'sha256'
    );

    // 生成随机 IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // 创建加密器
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 加密数据
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 获取认证标签
    const authTag = cipher.getAuthTag();

    // 组合：盐值 + IV + 认证标签 + 加密数据
    const result = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ]).toString('base64');

    return result;
  } catch (error) {
    console.error('加密失败:', error);
    throw new Error('加密失败');
  }
}

/**
 * 解密文本
 * @param encryptedData 加密后的字符串（base64 编码）
 * @returns 解密后的原文
 */
export function decrypt(encryptedData: string): string {
  try {
    // 解码 base64
    const data = Buffer.from(encryptedData, 'base64');

    // 提取各个部分
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = data.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // 使用盐值和机器密钥派生解密密钥
    const key = crypto.pbkdf2Sync(
      getMachineKey(),
      salt,
      100000,
      32,
      'sha256'
    );

    // 创建解密器
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // 解密数据
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('解密失败，数据可能已损坏或密钥不匹配');
  }
}

/**
 * 检查文本是否已加密（简单启发式检查）
 * @param text 要检查的文本
 * @returns 是否可能是加密数据
 */
export function isEncrypted(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // 检查是否是 base64 格式且长度合理
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(text)) {
    return false;
  }

  // 检查解码后的长度是否合理（至少包含盐值 + IV + 认证标签）
  try {
    const decoded = Buffer.from(text, 'base64');
    return decoded.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

/**
 * 安全地处理 API Key 存储
 * 如果数据未加密，则加密后返回；如果已加密，直接返回
 * @param apiKey API Key
 * @returns 加密后的 API Key
 */
export function secureStoreApiKey(apiKey: string): string {
  if (isEncrypted(apiKey)) {
    return apiKey;
  }
  return encrypt(apiKey);
}

/**
 * 安全地获取 API Key
 * 自动检测是否加密并进行相应处理
 * @param storedValue 存储的值
 * @returns 解密后的 API Key
 */
export function secureRetrieveApiKey(storedValue: string): string {
  if (!storedValue) {
    return '';
  }

  if (isEncrypted(storedValue)) {
    try {
      return decrypt(storedValue);
    } catch (error) {
      console.error('解密 API Key 失败:', error);
      return '';
    }
  }

  // 如果未加密，直接返回（向后兼容）
  return storedValue;
}
